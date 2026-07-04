// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract CarPassTypes {
    enum SiniestroGravedad {
        LEVE,
        MODERADO,
        GRAVE
    }

    enum VTVResultado {
        APROBADO,
        APROBADO_CON_OBSERVACIONES,
        RECHAZADO
    }

    enum SelloEstado {
        ACTIVO,
        VENCIDO,
        REVOCADO
    }

    struct VehiculoInfo {
        string vin;
        string marca;
        string modelo;
        uint16 anio;
        string color;
    }

    struct RegistroService {
        uint256 timestamp;
        string tipoServicio;
        uint32 kilometraje;
        address taller;
        string descripcion;
    }

    struct RegistroSiniestro {
        uint256 timestamp;
        uint256 costoEstimado;
        string descripcion;
        SiniestroGravedad gravedad;
        bool reparado;
        address declarante;
    }

    struct RegistroVTV {
        uint256 timestamp;
        uint256 vencimiento;
        VTVResultado resultado;
        address planta;
    }

    struct SelloCalidad {
        SelloEstado estado;
        string motivo;
    }
}
